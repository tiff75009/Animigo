import { Id } from "@/convex/_generated/dataModel";

export interface ServiceOption {
  id: string;
  name: string;
  description?: string;
  price: number;
  priceUnit?: string;
}

export interface SessionData {
  date: string;
  startTime: string;
  endTime: string;
}

export interface CollectiveSlotData {
  _id: string;
  date: string;
  startTime: string;
  endTime: string;
  availableSpots: number;
}

export interface PendingBookingData {
  id: Id<"pendingBookings">;
  announcer: {
    id: Id<"users">;
    slug?: string | null;
    firstName: string;
    lastName: string;
    profileImage: string | null;
    location: string;
    city?: string | null;
    postalCode?: string | null;
    coordinates?: { lat: number; lng: number };
    verified: boolean;
    accountType: string;
    companyType?: string;
    statusType: "particulier" | "micro_entrepreneur" | "professionnel";
  };
  service: {
    id: Id<"services">;
    category: string;
    categoryName: string;
    categoryIcon?: string;
    allowOvernightStay?: boolean;
    dayStartTime?: string;
    dayEndTime?: string;
    overnightPrice?: number;
    enableDurationBasedBlocking?: boolean;
    clientBillingMode?: "exact_hourly" | "round_half_day" | "round_full_day";
  };
  variant: {
    id: string;
    name: string;
    price: number;
    priceUnit: string;
    duration?: number;
    pricing?: {
      hourly?: number;
      daily?: number;
      weekly?: number;
      monthly?: number;
      nightly?: number;
    };
    numberOfSessions?: number;
    sessionInterval?: number;
    sessionType?: "individual" | "collective";
    animalTypes?: string[];
  } | null;
  options: Array<{ id: string; name: string; price: number }>;
  availableOptions: ServiceOption[];
  dates: {
    startDate: string;
    endDate: string;
    startTime?: string;
    endTime?: string;
  };
  amount: number;
  overnight?: {
    includeOvernightStay?: boolean;
    overnightNights?: number;
    overnightAmount?: number;
  };
  serviceLocation?: "announcer_home" | "client_home";
  guestAddress?: {
    address: string;
    city?: string;
    postalCode?: string;
    coordinates?: { lat: number; lng: number };
  };
  guestAnimalPreFill?: {
    type?: string;
    breed?: string;
    isMixedBreed?: boolean;
    primaryBreed?: string;
    secondaryBreed?: string;
  };
  collectiveSlotIds?: Id<"collectiveSlots">[];
  collectiveSlots?: CollectiveSlotData[];
  animalCount?: number;
  selectedAnimalType?: string;
  selectedAnimalIds?: string[];
  sessions?: SessionData[];
  userId?: Id<"users">;
  expiresAt: number;
}

export interface GuestData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
}

export interface PriceCalculationResult {
  firstDayAmount: number;
  firstDayHours: number;
  firstDayIsFullDay: boolean;
  firstDayIsHalfDay: boolean;
  fullDays: number;
  fullDaysAmount: number;
  lastDayAmount: number;
  lastDayHours: number;
  lastDayIsFullDay: boolean;
  lastDayIsHalfDay: boolean;
  nightsAmount: number;
  nights: number;
  optionsAmount: number;
  totalAmount: number;
  hourlyRate: number;
  halfDailyRate: number;
  dailyRate: number;
  nightlyRate: number;
  billingUnit: "hour" | "half_day" | "day" | "fixed";
}

export interface BillingInfo {
  billingUnit: "hour" | "half_day" | "day" | "fixed";
  fullDays: number;
  halfDays: number;
  firstDayIsHalfDay: boolean;
  lastDayIsHalfDay: boolean;
  dayStartTime: string;
  dayEndTime: string;
}
