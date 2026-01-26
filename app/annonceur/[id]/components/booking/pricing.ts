import type { FormuleData, OptionData, ServiceData } from "../types";
import type { BookingSelection, PriceBreakdown } from "./types";

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
function daysBetween(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = end.getTime() - start.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

// Format price (cents -> euros)
export function formatPrice(priceInCents: number): string {
  return (priceInCents / 100).toFixed(2).replace(".", ",");
}

// Format price with commission
export function formatPriceWithCommission(priceInCents: number, commissionRate: number): string {
  const commission = Math.round((priceInCents * commissionRate) / 100);
  return formatPrice(priceInCents + commission);
}

// Calculate price with commission
export function calculatePriceWithCommission(basePriceCents: number, commissionRate: number): number {
  const commission = Math.round((basePriceCents * commissionRate) / 100);
  return basePriceCents + commission;
}

// Calculate total price for collective formulas
// For collective formulas:
// - If priceUnit is "flat": price is the pack price (all sessions included)
// - If priceUnit is "hour": price is hourly, need to multiply by duration and sessions
// Total = (pack price) × (number of animals) × (1 + commission%)
export interface CollectivePriceBreakdown {
  basePrice: number; // pack price × animalCount (in cents)
  commission: number; // commission amount (in cents)
  total: number; // basePrice + commission (in cents)
  pricePerAnimal: number; // pack price per animal (in cents)
  animalCount: number;
  numberOfSessions: number;
}

export function calculateCollectivePrice(
  variantPrice: number, // in cents - the base price
  animalCount: number,
  commissionRate: number,
  numberOfSessions: number = 1,
  priceUnit: string = "flat", // "hour", "day", "flat", etc.
  durationMinutes: number = 60 // duration per session in minutes
): CollectivePriceBreakdown {
  // Calculate the pack price based on price unit
  let packPrice: number;

  if (priceUnit === "flat") {
    // Price is already the total pack price
    packPrice = variantPrice;
  } else if (priceUnit === "hour") {
    // Price is hourly - calculate total for all sessions
    // packPrice = hourlyPrice × (duration in hours) × numberOfSessions
    const hoursPerSession = durationMinutes / 60;
    packPrice = Math.round(variantPrice * hoursPerSession * numberOfSessions);
  } else {
    // For other units (day, week, month), use price directly multiplied by sessions
    packPrice = variantPrice * numberOfSessions;
  }

  // Multiply by number of animals
  const basePrice = packPrice * animalCount;
  const commission = Math.round((basePrice * commissionRate) / 100);
  const total = basePrice + commission;

  return {
    basePrice,
    commission,
    total,
    pricePerAnimal: packPrice,
    animalCount,
    numberOfSessions,
  };
}

// Format duration
export function formatDuration(days: number, hours: number, nights: number): string {
  const parts: string[] = [];

  if (days > 0) {
    parts.push(`${days} jour${days > 1 ? "s" : ""}`);
  }
  if (hours > 0 && hours !== days * 8) {
    parts.push(`${hours.toFixed(1).replace(".0", "")}h`);
  }
  if (nights > 0) {
    parts.push(`${nights} nuit${nights > 1 ? "s" : ""}`);
  }

  return parts.join(" + ") || "1 jour";
}

// Format date for display
export function formatDateDisplay(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

// Determine if it's a garde service (daily pricing) or a punctual service (hourly pricing)
export function isGardeService(service: ServiceData): boolean {
  const categorySlug = service.categorySlug || service.categoryId || "";
  return categorySlug.toString().includes("garde") || categorySlug === "garde";
}

// Get best price and unit for a formule
export function getFormuleBestPrice(
  formule: FormuleData,
  isGarde: boolean
): { price: number; unit: string } {
  const pricing = formule.pricing;

  if (pricing) {
    if (isGarde) {
      if (pricing.daily) return { price: pricing.daily, unit: "jour" };
      if (pricing.weekly) return { price: pricing.weekly, unit: "semaine" };
      if (pricing.monthly) return { price: pricing.monthly, unit: "mois" };
      if (pricing.hourly) return { price: pricing.hourly, unit: "heure" };
    } else {
      if (pricing.hourly) return { price: pricing.hourly, unit: "heure" };
      if (pricing.daily) return { price: pricing.daily, unit: "jour" };
      if (pricing.weekly) return { price: pricing.weekly, unit: "semaine" };
      if (pricing.monthly) return { price: pricing.monthly, unit: "mois" };
    }
  }

  // Fallback sur price/unit
  if (formule.price > 0) {
    let unit = isGarde ? "jour" : "heure";
    if (formule.unit === "day") unit = "jour";
    else if (formule.unit === "hour") unit = "heure";
    else if (formule.unit === "week") unit = "semaine";
    else if (formule.unit === "month") unit = "mois";
    else if (formule.unit === "flat") unit = "";
    return { price: formule.price, unit };
  }

  return { price: 0, unit: "" };
}

// Get minimum price for a service
export function getServiceMinPrice(service: ServiceData): { price: number; unit: string } {
  const isGarde = isGardeService(service);
  let minPrice = Infinity;
  let minUnit = "";

  for (const formule of service.formules) {
    const { price, unit } = getFormuleBestPrice(formule, isGarde);
    if (price > 0 && price < minPrice) {
      minPrice = price;
      minUnit = unit;
    }
  }

  return { price: minPrice === Infinity ? 0 : minPrice, unit: minUnit };
}

// Types de prix autorisés
export type PriceUnit = "hour" | "half_day" | "day" | "week" | "month";

// Calculate smart price with partial day support
interface SmartPriceParams {
  startDate: string;
  endDate: string | null;
  startTime: string | null;
  endTime: string | null;
  includeOvernightStay: boolean;
  dayStartTime: string;
  dayEndTime: string;
  workdayHours: number;
  halfDayHours?: number; // Par défaut workdayHours / 2
  pricing: {
    hourly?: number;
    halfDaily?: number;
    daily?: number;
    nightly?: number;
  };
  optionsTotal: number;
  fixedServicePrice?: number;
  serviceDurationMinutes?: number;
  // Types de prix autorisés - si défini, on arrondit au type le plus proche
  allowedPriceUnits?: PriceUnit[];
}

export function calculateSmartPrice(params: SmartPriceParams): Omit<PriceBreakdown, "subtotal" | "commission" | "total"> {
  const {
    startDate,
    endDate,
    startTime,
    endTime,
    includeOvernightStay,
    dayStartTime,
    dayEndTime,
    workdayHours,
    halfDayHours: customHalfDayHours,
    pricing,
    optionsTotal,
    fixedServicePrice,
    serviceDurationMinutes,
    allowedPriceUnits,
  } = params;

  // Calculate half-day hours (default to workdayHours / 2)
  const halfDayHours = customHalfDayHours || workdayHours / 2;

  // Check which price units are allowed
  const allowHourly = !allowedPriceUnits || allowedPriceUnits.includes("hour");
  const allowHalfDay = allowedPriceUnits?.includes("half_day") ?? false;
  const allowDaily = !allowedPriceUnits || allowedPriceUnits.includes("day");

  // Determine rates
  const hourlyRate = pricing.hourly || (pricing.daily ? Math.round(pricing.daily / workdayHours) : 0);
  const halfDailyRate = pricing.halfDaily || (pricing.daily ? Math.round(pricing.daily / 2) : (hourlyRate ? hourlyRate * halfDayHours : 0));
  const dailyRate = pricing.daily || (hourlyRate ? hourlyRate * workdayHours : 0);
  const nightlyRate = pricing.nightly || 0;

  // Helper: Calculate amount for a partial day based on allowed price units
  const calculatePartialDayAmount = (hours: number): { amount: number; isFullDay: boolean; isHalfDay: boolean } => {
    // Si le nombre d'heures dépasse la journée de travail, c'est une journée complète
    if (hours >= workdayHours) {
      return { amount: dailyRate, isFullDay: true, isHalfDay: false };
    }

    // Si la facturation horaire n'est PAS autorisée, on arrondit
    if (!allowHourly) {
      // Si demi-journée est autorisée
      if (allowHalfDay && halfDailyRate > 0) {
        if (hours <= halfDayHours) {
          // Moins d'une demi-journée → facturer demi-journée
          return { amount: halfDailyRate, isFullDay: false, isHalfDay: true };
        } else {
          // Plus d'une demi-journée mais moins d'une journée → facturer journée
          return { amount: dailyRate, isFullDay: true, isHalfDay: false };
        }
      }
      // Si seulement la journée est autorisée, facturer la journée
      if (allowDaily && dailyRate > 0) {
        return { amount: dailyRate, isFullDay: true, isHalfDay: false };
      }
    }

    // Facturation horaire autorisée
    if (hourlyRate > 0) {
      const hourlyAmount = Math.round(hourlyRate * hours);
      // Cap hourly amount at daily rate to avoid paying more for fewer hours
      const cappedAmount = dailyRate > 0 ? Math.min(hourlyAmount, dailyRate) : hourlyAmount;
      return { amount: cappedAmount, isFullDay: cappedAmount >= dailyRate, isHalfDay: false };
    }

    // Fallback: journée complète
    return { amount: dailyRate, isFullDay: true, isHalfDay: false };
  };

  // Calculate total days
  const effectiveEndDate = endDate || startDate;
  const totalDays = daysBetween(startDate, effectiveEndDate) + 1;

  // Single day booking
  if (totalDays === 1) {
    let firstDayHours: number;
    let firstDayAmount: number;
    let firstDayIsFullDay = false;
    let firstDayIsHalfDay = false;

    // Duration-based blocking: use fixed price
    if (fixedServicePrice !== undefined && serviceDurationMinutes !== undefined) {
      firstDayHours = serviceDurationMinutes / 60;
      firstDayAmount = fixedServicePrice;

      return {
        baseAmount: firstDayAmount,
        firstDayAmount,
        firstDayHours,
        firstDayIsFullDay: false,
        firstDayIsHalfDay: false,
        fullDays: 0,
        fullDaysAmount: 0,
        lastDayAmount: 0,
        lastDayHours: 0,
        lastDayIsFullDay: false,
        lastDayIsHalfDay: false,
        nightsAmount: 0,
        nights: 0,
        optionsAmount: optionsTotal,
        daysCount: 1,
        hoursCount: firstDayHours,
        hourlyRate: 0,
        halfDailyRate: 0,
        dailyRate: 0,
        nightlyRate,
        billingUnit: "fixed",
      };
    }

    if (startTime && endTime) {
      firstDayHours = calculateHoursBetween(startTime, endTime);
      const partialDayResult = calculatePartialDayAmount(firstDayHours);
      firstDayAmount = partialDayResult.amount;
      firstDayIsFullDay = partialDayResult.isFullDay;
      firstDayIsHalfDay = partialDayResult.isHalfDay;
    } else {
      firstDayHours = workdayHours;
      firstDayAmount = dailyRate || (hourlyRate * workdayHours);
      firstDayIsFullDay = true;
    }

    // Determine billing unit for display
    let billingUnit: "hour" | "half_day" | "day" | "fixed" = "hour";
    if (firstDayIsFullDay) billingUnit = "day";
    else if (firstDayIsHalfDay) billingUnit = "half_day";

    return {
      baseAmount: firstDayAmount,
      firstDayAmount,
      firstDayHours,
      firstDayIsFullDay,
      firstDayIsHalfDay,
      fullDays: 0,
      fullDaysAmount: 0,
      lastDayAmount: 0,
      lastDayHours: 0,
      lastDayIsFullDay: false,
      lastDayIsHalfDay: false,
      nightsAmount: 0,
      nights: 0,
      optionsAmount: optionsTotal,
      daysCount: 1,
      hoursCount: firstDayHours,
      hourlyRate,
      halfDailyRate,
      dailyRate,
      nightlyRate,
      billingUnit,
    };
  }

  // Multi-day booking
  const effectiveStartTime = startTime || dayStartTime;
  const firstDayEndTime = dayEndTime;
  let firstDayHours = calculateHoursBetween(effectiveStartTime, firstDayEndTime);

  const firstDayResult = calculatePartialDayAmount(firstDayHours);
  let firstDayAmount = firstDayResult.amount;
  let firstDayIsFullDay = firstDayResult.isFullDay;
  let firstDayIsHalfDay = firstDayResult.isHalfDay;

  const lastDayStartTime = dayStartTime;
  const effectiveEndTime = endTime || dayEndTime;
  let lastDayHours = calculateHoursBetween(lastDayStartTime, effectiveEndTime);

  const lastDayResult = calculatePartialDayAmount(lastDayHours);
  let lastDayAmount = lastDayResult.amount;
  let lastDayIsFullDay = lastDayResult.isFullDay;
  let lastDayIsHalfDay = lastDayResult.isHalfDay;

  const fullDays = Math.max(0, totalDays - 2);
  const fullDaysAmount = fullDays * dailyRate;

  const nights = includeOvernightStay ? totalDays - 1 : 0;
  const nightsAmount = nights * nightlyRate;

  const baseAmount = firstDayAmount + fullDaysAmount + lastDayAmount;

  // Determine primary billing unit for display
  let billingUnit: "hour" | "half_day" | "day" | "fixed" = "day";
  if (!firstDayIsFullDay && !firstDayIsHalfDay && !lastDayIsFullDay && !lastDayIsHalfDay) {
    billingUnit = "hour";
  } else if ((firstDayIsHalfDay || lastDayIsHalfDay) && fullDays === 0) {
    billingUnit = "half_day";
  }

  return {
    baseAmount,
    firstDayAmount,
    firstDayHours,
    firstDayIsFullDay,
    firstDayIsHalfDay,
    fullDays,
    fullDaysAmount,
    lastDayAmount,
    lastDayHours,
    lastDayIsFullDay,
    lastDayIsHalfDay,
    nightsAmount,
    nights,
    optionsAmount: optionsTotal,
    daysCount: totalDays,
    hoursCount: firstDayHours + (fullDays * workdayHours) + lastDayHours,
    hourlyRate,
    halfDailyRate,
    dailyRate,
    nightlyRate,
    billingUnit,
  };
}

// Calculate full price breakdown with commission
export function calculatePriceBreakdown(
  service: ServiceData | null,
  variant: FormuleData | null,
  selection: BookingSelection,
  commissionRate: number,
  workdayHours: number = 8,
  dayStartTime: string = "08:00",
  dayEndTime: string = "20:00",
  overnightPrice?: number,
  enableDurationBasedBlocking?: boolean,
  allowedPriceUnits?: PriceUnit[]
): PriceBreakdown | null {
  if (!service || !variant || !selection.startDate) {
    return null;
  }

  const pricing = variant.pricing || {};
  const isGarde = isGardeService(service);

  // Calculate options total
  const optionsTotal = selection.selectedOptionIds.reduce((sum, optId) => {
    const opt = service.options.find((o) => o.id === optId);
    return sum + (opt?.price || 0);
  }, 0);

  // Get pricing values
  const hourlyPrice = pricing.hourly || variant.price || 0;
  const halfDailyPrice = (pricing as { halfDaily?: number }).halfDaily || 0;
  const dailyPrice = pricing.daily || (isGarde ? variant.price : 0) || 0;
  const nightlyPrice = (pricing as { nightly?: number }).nightly || overnightPrice || 0;

  // Duration-based services: use fixed price for the variant's duration
  let fixedServicePrice: number | undefined;
  let serviceDurationMinutes: number | undefined;

  if (enableDurationBasedBlocking && variant.duration && variant.duration > 0) {
    // For duration-based services, the variant.price represents the total price
    // for the service duration (e.g., 35€ for a 60-minute grooming session)
    fixedServicePrice = variant.price;
    serviceDurationMinutes = variant.duration;
  }

  const smartPrice = calculateSmartPrice({
    startDate: selection.startDate,
    endDate: selection.endDate,
    startTime: selection.startTime,
    endTime: selection.endTime,
    includeOvernightStay: selection.includeOvernightStay,
    dayStartTime,
    dayEndTime,
    workdayHours,
    pricing: {
      hourly: hourlyPrice,
      halfDaily: halfDailyPrice,
      daily: dailyPrice,
      nightly: nightlyPrice,
    },
    optionsTotal,
    fixedServicePrice,
    serviceDurationMinutes,
    allowedPriceUnits,
  });

  const subtotal = smartPrice.baseAmount + smartPrice.nightsAmount + smartPrice.optionsAmount;
  const commission = Math.round((subtotal * commissionRate) / 100);
  const total = subtotal + commission;

  return {
    ...smartPrice,
    subtotal,
    commission,
    total,
  };
}
