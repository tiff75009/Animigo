"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Package,
  Zap,
  Check,
  Clock,
  Calendar,
} from "lucide-react";
import { cn } from "@/app/lib/utils";
import { type AnnouncerResult } from "@/app/hooks/useSearch";
import { formatPrice, priceUnitLabels } from "./helpers";
import { bookingTimeSlots, monthNames, weekDays } from "./constants";

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

interface FormulasModalProps {
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
}

export function FormulasModal({ isOpen, onClose, announcer, searchFilters }: FormulasModalProps) {
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

  const formatDateLocal = (d: Date) => {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };

  const startOfMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1);
  const endOfMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0);

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
    return serviceDetails.filter((s: { category: string }) => s.category === categoryFilter);
  }, [serviceDetails, categoryFilter]);

  const availableCategories = useMemo(() => {
    if (!serviceDetails) return [];
    return serviceDetails.map((s: { category: string; categoryName: string; categoryIcon?: string }) => ({
      slug: s.category,
      name: s.categoryName,
      icon: s.categoryIcon,
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
      const token = localStorage.getItem("auth_token") || undefined;
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
  const calendarData = availabilityCalendar?.calendar ?? [];

  const getDateStatus = (date: string) => {
    if (!availabilityCalendar) return "loading";
    const dayInfo = calendarData.find((d: { date: string; status?: string }) => d.date === date);
    return dayInfo?.status ?? "available";
  };

  const getBookedSlotsForDate = (date: string) => {
    const dayInfo = calendarData.find((d: { date: string; bookedSlots?: Array<{ startTime: string; endTime: string }> }) => d.date === date);
    return dayInfo?.bookedSlots ?? [];
  };

  const isTimeSlotBooked = (time: string) => {
    if (!selectedDate || !availabilityCalendar) return false;
    const bookedSlots = getBookedSlotsForDate(selectedDate);
    const bufferBefore = availabilityCalendar.bufferBefore ?? 0;
    const bufferAfter = availabilityCalendar.bufferAfter ?? 0;
    const parseTime = (t: string) => {
      const [h, m] = t.split(":").map(Number);
      return h * 60 + m;
    };
    const slotStart = parseTime(time);
    return bookedSlots.some((booked: { startTime: string; endTime: string }) => {
      const bookedStart = parseTime(booked.startTime) - bufferBefore;
      const bookedEnd = parseTime(booked.endTime) + bufferAfter;
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
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-4 md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-lg z-50"
          >
            <div className="bg-white rounded-2xl shadow-2xl h-full md:h-auto md:max-h-[85vh] flex flex-col overflow-hidden">
              {/* Header */}
              <div className="flex items-center gap-4 p-5 border-b border-gray-100">
                {step === "booking" && (
                  <button
                    onClick={() => setStep("formulas")}
                    className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                )}
                <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                  {announcer.profileImage ? (
                    <Image src={announcer.profileImage} alt={announcer.firstName} fill className="object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xl">👤</div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-gray-900">
                    {step === "booking" ? `Réserver avec ${announcer.firstName}` : `${announcer.firstName} ${announcer.lastName.charAt(0)}.`}
                  </h3>
                  {step === "formulas" ? (
                    <p className="text-sm text-gray-500">
                      {totalVariants} prestation{totalVariants > 1 ? "s" : ""} disponible{totalVariants > 1 ? "s" : ""}
                    </p>
                  ) : selection ? (
                    <p className="text-sm text-gray-500 truncate">
                      {selection.variantName} - {formatPrice(selection.variantPrice)}{priceUnitLabels[selection.variantPriceUnit]}
                    </p>
                  ) : null}
                </div>
                <button
                  onClick={handleClose}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-5">
                {step === "formulas" && (
                  <>
                    {isLoading ? (
                      <div className="flex items-center justify-center py-12">
                        <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
                      </div>
                    ) : serviceDetails && serviceDetails.length > 0 ? (
                      <div className="space-y-6">
                        {availableCategories.length > 1 && (
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => setCategoryFilter("all")}
                              className={cn(
                                "px-3 py-1.5 rounded-full text-sm font-medium transition-all",
                                categoryFilter === "all"
                                  ? "bg-gray-900 text-white"
                                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                              )}
                            >
                              Tout
                            </button>
                            {availableCategories.map((cat: { slug: string; name: string; icon?: string }) => (
                              <button
                                key={cat.slug}
                                onClick={() => setCategoryFilter(cat.slug)}
                                className={cn(
                                  "px-3 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-1.5",
                                  categoryFilter === cat.slug
                                    ? "bg-gray-900 text-white"
                                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                )}
                              >
                                {cat.icon && <span>{cat.icon}</span>}
                                {cat.name}
                              </button>
                            ))}
                          </div>
                        )}

                        {filteredServices.map((service: {
                          id: string;
                          category: string;
                          categoryName: string;
                          categoryIcon?: string;
                          variants: Array<{
                            id: string;
                            name: string;
                            price: number;
                            priceUnit: string;
                            duration?: number;
                            description?: string;
                            includedFeatures?: string[];
                          }>;
                          options: Array<{ id: string; name: string; price: number }>;
                        }) => (
                          <div key={service.id} className="space-y-3">
                            <div className="flex items-center gap-2">
                              <span className="text-xl">{service.categoryIcon ?? "✨"}</span>
                              <h4 className="font-semibold text-gray-900">{service.categoryName}</h4>
                            </div>

                            {service.variants.map((variant: {
                              id: string;
                              name: string;
                              price: number;
                              priceUnit: string;
                              duration?: number;
                              description?: string;
                              includedFeatures?: string[];
                            }) => (
                              <div
                                key={variant.id}
                                className="p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                              >
                                <div className="flex items-start justify-between gap-4">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                      <h5 className="font-medium text-gray-900">{variant.name}</h5>
                                      {variant.duration && (
                                        <span className="text-xs px-2 py-0.5 bg-gray-200 rounded-full text-gray-600">
                                          {variant.duration < 60 ? `${variant.duration}min` : `${Math.floor(variant.duration / 60)}h${variant.duration % 60 > 0 ? variant.duration % 60 : ""}`}
                                        </span>
                                      )}
                                    </div>
                                    {variant.description && (
                                      <p className="text-sm text-gray-500 mt-1">{variant.description}</p>
                                    )}
                                    {variant.includedFeatures && variant.includedFeatures.length > 0 && (
                                      <div className="mt-2 flex flex-wrap gap-1">
                                        {variant.includedFeatures.slice(0, 3).map((f: string, i: number) => (
                                          <span key={i} className="text-xs text-secondary flex items-center gap-1">
                                            <Check className="w-3 h-3" />
                                            {f}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                  <div className="text-right flex-shrink-0">
                                    {variant.priceUnit === "hour" && variant.duration ? (
                                      <>
                                        <div className="text-lg font-bold text-gray-900">
                                          {formatPrice(Math.round((variant.price * variant.duration) / 60))}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                          {formatPrice(variant.price)}/h
                                        </div>
                                      </>
                                    ) : (
                                      <>
                                        <div className="text-lg font-bold text-gray-900">
                                          {formatPrice(variant.price)}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                          {priceUnitLabels[variant.priceUnit]}
                                        </div>
                                      </>
                                    )}
                                  </div>
                                </div>
                                <button
                                  onClick={() => handleSelectVariant(service.id, variant, service.category)}
                                  className="w-full mt-3 py-2.5 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors"
                                >
                                  Sélectionner
                                </button>
                              </div>
                            ))}

                            {service.options.length > 0 && (
                              <div className="flex flex-wrap gap-2 pt-2">
                                {service.options.map((opt: { id: string; name: string; price: number }) => (
                                  <span key={opt.id} className="text-xs px-2 py-1 bg-amber-50 text-amber-700 rounded-full flex items-center gap-1">
                                    <Zap className="w-3 h-3" />
                                    {opt.name} +{formatPrice(opt.price)}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500">Aucune prestation disponible</p>
                      </div>
                    )}
                  </>
                )}

                {step === "booking" && selection && (
                  <div className="space-y-6">
                    {/* Calendar */}
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-primary" />
                        {isRangeMode ? "Sélectionnez vos dates" : "Sélectionnez une date"}
                      </h4>
                      <div className="bg-gray-50 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-4">
                          <button
                            onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1))}
                            className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                          >
                            <ChevronLeft className="w-5 h-5" />
                          </button>
                          <h5 className="font-semibold">
                            {monthNames[calendarMonth.getMonth()]} {calendarMonth.getFullYear()}
                          </h5>
                          <button
                            onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1))}
                            className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                          >
                            <ChevronRight className="w-5 h-5" />
                          </button>
                        </div>
                        <div className="grid grid-cols-7 gap-1 mb-2">
                          {weekDays.map((d) => (
                            <div key={d} className="text-center text-xs font-medium text-gray-400 py-2">
                              {d}
                            </div>
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
                                  !isCurrentMonth && "text-gray-300",
                                  isCurrentMonth && !isDisabled && "text-gray-700 hover:bg-gray-200",
                                  isDisabled && "text-gray-300 cursor-not-allowed",
                                  status === "partial" && isCurrentMonth && "bg-amber-100 text-amber-700",
                                  (isSelected || isEndSelected) && "bg-primary text-white hover:bg-primary",
                                  isInRange && "bg-primary/20"
                                )}
                              >
                                {day}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Time slots */}
                    {!isRangeMode && selectedDate && (
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
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
                                  isBooked
                                    ? "bg-gray-100 text-gray-400 cursor-not-allowed line-through"
                                    : selectedTime === time
                                    ? "bg-primary text-white"
                                    : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                                )}
                              >
                                {time}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Total */}
                    {selectedDate && (
                      <div className="bg-primary/5 rounded-xl p-4 flex items-center justify-between">
                        <span className="text-gray-600">Total estimé</span>
                        <span className="text-xl font-bold text-gray-900">
                          {formatPrice(calculateAmount())}
                        </span>
                      </div>
                    )}

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
                <div className="p-4 border-t border-gray-100">
                  <button
                    onClick={handleContinueBooking}
                    disabled={isSubmitting || !selectedDate || (!isRangeMode && !selectedTime)}
                    className={cn(
                      "w-full py-3 rounded-xl font-semibold transition-colors",
                      isSubmitting || !selectedDate || (!isRangeMode && !selectedTime)
                        ? "bg-gray-100 text-gray-400 cursor-not-allowed"
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
