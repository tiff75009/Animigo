import type { Id } from "@/convex/_generated/dataModel";

// ─── Types retournés par la query backend ──────────────

export interface UserInfo {
  accountType: string;
  companyType?: string;
  isVatSubject: boolean;
  siret?: string;
  companyName?: string;
  commissionRate: number;
  commissionType: string;
  commissionLabel: string;
}

export interface PaymentStats {
  totalEarnings: number;
  totalPending: number;
  totalCollected: number;
  pendingCount: number;
  collectedCount: number;
  totalVatCollected: number;
  totalVatOnCommission: number;
}

export interface MonthlyRevenueItem {
  month: number;
  monthLabel: string;
  earnings: number;
  earningsHT: number;
  vatAmount: number;
  vatOnCommission: number;
  missionsCount: number;
  commissionsTotal: number;
}

export interface AnnualRevenueItem {
  year: number;
  total: number;
  totalHT: number;
  vat: number;
  count: number;
}

export interface MissionDetail {
  _id: Id<"missions">;
  // Dates
  bookedAt: number;
  paidAt?: number;
  startDate: string;
  endDate: string;
  startTime?: string;
  endTime?: string;
  completedAt?: number;
  // Montants (euros)
  serviceAmount: number;
  basePrice: number;
  optionsPrice: number;
  platformFee: number;
  stripeFee: number;
  amount: number;
  announcerEarnings: number;
  commissionRate: number;
  // Pro TVA
  vatAmount: number;
  vatOnCommission: number;
  earningsHT: number;
  // Infos
  clientName: string;
  animal: { name: string; type: string; emoji: string };
  animals?: Array<{ name: string; type: string; emoji: string }>;
  serviceName: string;
  serviceCategory: string;
  sessionType?: "individual" | "collective";
  serviceLocation?: "announcer_home" | "client_home";
  // Statuts
  status: string;
  paymentStatus: string;
  announcerPaymentStatus?: string;
  readyForPayout?: boolean;
  payoutScheduledFor?: number;
  // Annulations
  cancelledBy?: string;
  cancelledAt?: number;
  cancellationReason?: string;
  refundAmount?: number;
  announcerRetainedAmount: number;
}

export interface PayoutDetail {
  id: Id<"announcerPayouts">;
  date: number;
  amount: number;
  grossAmount?: number;
  commissionAmount?: number;
  status: string; // "pending" | "processing" | "completed" | "failed"
  failureReason?: string;
  stripePayoutId?: string;
  missionsCount: number;
  missionNames: string[];
}

export interface NextPayoutInfo {
  amount: number;
  missionsCount: number;
  scheduledDate: number;
}

export interface AnnouncerPaymentsData {
  userInfo: UserInfo;
  stats: PaymentStats;
  monthlyRevenue: MonthlyRevenueItem[];
  annualRevenue: {
    currentYear: AnnualRevenueItem;
    previousYear: AnnualRevenueItem;
  };
  currentMonth: number;
  selectedYear: number;
  missionsByStatus: {
    awaitingPayment: MissionDetail[];
    paid: MissionDetail[];
    completed: MissionDetail[];
    cancelled: MissionDetail[];
  };
  payoutHistory: PayoutDetail[];
  nextPayout: NextPayoutInfo | null;
}

export type PaymentTab = "awaitingPayment" | "paid" | "completed" | "cancelled";

// ─── Helpers de formatage ──────────────────────────────

export function formatPrice(euros: number): string {
  return euros.toLocaleString("fr-FR", {
    style: "currency",
    currency: "EUR",
  });
}

export function formatDateShort(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
  });
}

export function formatTimestamp(ts: number): string {
  return new Date(ts).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatTimestampShort(ts: number): string {
  return new Date(ts).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
  });
}
