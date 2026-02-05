import type { PriceCalculationResult } from "./types";

// Helper: Parse time to minutes
export function parseTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

// Helper: Calculate distance between two coordinates (Haversine formula)
export function calculateDistance(
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

// Helper: Format distance for display
export function formatDistance(distance: number): string {
  if (distance < 1) {
    return "moins d'1 km";
  }
  return `${Math.round(distance)} km`;
}

// Helper: Calculate hours between two times
export function calculateHoursBetween(startTime: string, endTime: string): number {
  const startMinutes = parseTimeToMinutes(startTime);
  const endMinutes = parseTimeToMinutes(endTime);
  const diff = endMinutes - startMinutes;
  return Math.max(0, diff / 60);
}

// Helper: Calculate days between two dates
export function daysBetweenDates(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = end.getTime() - start.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

// Calculate smart pricing with partial day support and billing mode
export function calculateSmartPrice(params: {
  startDate: string;
  endDate: string | null;
  startTime: string | null;
  endTime: string | null;
  includeOvernightStay: boolean;
  dayStartTime: string;
  dayEndTime: string;
  workdayHours: number;
  halfDayHours?: number;
  pricing: {
    hourly?: number;
    halfDaily?: number;
    daily?: number;
    nightly?: number;
  };
  optionsTotal: number;
  fixedServicePrice?: number;
  serviceDurationMinutes?: number;
  clientBillingMode?: "exact_hourly" | "round_half_day" | "round_full_day";
}): PriceCalculationResult {
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
    clientBillingMode,
  } = params;

  const halfDayHours = customHalfDayHours || workdayHours / 2;

  const hourlyRate = pricing.hourly || (pricing.daily ? Math.round(pricing.daily / workdayHours) : 0);
  const halfDailyRate = pricing.halfDaily || (pricing.daily ? Math.round(pricing.daily / 2) : (hourlyRate ? hourlyRate * halfDayHours : 0));
  const dailyRate = pricing.daily || (hourlyRate ? hourlyRate * workdayHours : 0);
  const nightlyRate = pricing.nightly || 0;

  const calculatePartialDayAmount = (hours: number): { amount: number; isFullDay: boolean; isHalfDay: boolean } => {
    if (hours >= workdayHours) {
      return { amount: dailyRate, isFullDay: true, isHalfDay: false };
    }

    if (clientBillingMode === "round_half_day") {
      if (hours <= halfDayHours) {
        return { amount: halfDailyRate, isFullDay: false, isHalfDay: true };
      }
      return { amount: dailyRate, isFullDay: true, isHalfDay: false };
    }

    if (clientBillingMode === "round_full_day") {
      return { amount: dailyRate, isFullDay: true, isHalfDay: false };
    }

    if (hourlyRate > 0) {
      const hourlyAmount = Math.round(hourlyRate * hours);
      const cappedAmount = dailyRate > 0 ? Math.min(hourlyAmount, dailyRate) : hourlyAmount;
      return { amount: cappedAmount, isFullDay: cappedAmount >= dailyRate, isHalfDay: false };
    }

    return { amount: dailyRate, isFullDay: true, isHalfDay: false };
  };

  const effectiveEndDate = endDate || startDate;
  const totalDays = daysBetweenDates(startDate, effectiveEndDate) + 1;

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
        totalAmount: firstDayAmount + optionsTotal,
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

    let billingUnit: "hour" | "half_day" | "day" | "fixed" = "hour";
    if (firstDayIsFullDay) billingUnit = "day";
    else if (firstDayIsHalfDay) billingUnit = "half_day";

    return {
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
      totalAmount: firstDayAmount + optionsTotal,
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
  const firstDayHours = calculateHoursBetween(effectiveStartTime, firstDayEndTime);

  const firstDayResult = calculatePartialDayAmount(firstDayHours);
  const firstDayAmount = firstDayResult.amount;
  const firstDayIsFullDay = firstDayResult.isFullDay;
  const firstDayIsHalfDay = firstDayResult.isHalfDay;

  const lastDayStartTime = dayStartTime;
  const effectiveEndTime = endTime || dayEndTime;
  const lastDayHours = calculateHoursBetween(lastDayStartTime, effectiveEndTime);

  const lastDayResult = calculatePartialDayAmount(lastDayHours);
  const lastDayAmount = lastDayResult.amount;
  const lastDayIsFullDay = lastDayResult.isFullDay;
  const lastDayIsHalfDay = lastDayResult.isHalfDay;

  const fullDays = Math.max(0, totalDays - 2);
  const fullDaysAmount = fullDays * dailyRate;

  const nights = includeOvernightStay ? totalDays - 1 : 0;
  const nightsAmount = nights * nightlyRate;

  const totalAmount = firstDayAmount + fullDaysAmount + lastDayAmount + nightsAmount + optionsTotal;

  let billingUnit: "hour" | "half_day" | "day" | "fixed" = "day";
  if (!firstDayIsFullDay && !firstDayIsHalfDay && !lastDayIsFullDay && !lastDayIsHalfDay) {
    billingUnit = "hour";
  } else if ((firstDayIsHalfDay || lastDayIsHalfDay) && fullDays === 0) {
    billingUnit = "half_day";
  }

  return {
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
    totalAmount,
    hourlyRate,
    halfDailyRate,
    dailyRate,
    nightlyRate,
    billingUnit,
  };
}

// Format hours for display
export function formatHoursDisplay(hours: number): string {
  if (hours === Math.floor(hours)) {
    return `${hours}h`;
  }
  const wholeHours = Math.floor(hours);
  const minutes = Math.round((hours - wholeHours) * 60);
  return `${wholeHours}h${minutes.toString().padStart(2, "0")}`;
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function formatShortDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export function formatTime(time: string): string {
  const [hours, minutes] = time.split(":");
  return minutes === "00" ? `${parseInt(hours)}h` : `${parseInt(hours)}h${minutes}`;
}

export function formatPrice(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",") + " \u20ac";
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h${mins}` : `${hours}h`;
}

export function calculateEndTime(startTime: string, durationMinutes: number): string {
  const [hours, minutes] = startTime.split(":").map(Number);
  const totalMinutes = hours * 60 + minutes + durationMinutes;
  const endHours = Math.floor(totalMinutes / 60) % 24;
  const endMinutes = totalMinutes % 60;
  return `${endHours.toString().padStart(2, "0")}:${endMinutes.toString().padStart(2, "0")}`;
}

export function calculateServicePrice(hourlyRateCents: number, durationMinutes: number): number {
  return Math.round((hourlyRateCents * durationMinutes) / 60);
}

export function extractCity(location: string): string {
  const parts = location.split(",").map((p) => p.trim());
  const lastPart = parts[parts.length - 1];
  if (/^\d/.test(lastPart)) {
    const cityMatch = lastPart.match(/\d+\s+(.+)/);
    return cityMatch ? cityMatch[1] : lastPart;
  }
  return lastPart;
}
