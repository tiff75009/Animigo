import type { Id } from "@/convex/_generated/dataModel";

// ─── Interfaces ──────────────────────────────────────────

export interface PayoutHistoryItem {
  id: Id<"announcerPayouts">;
  date: number;
  amount: number;
  grossAmount?: number;
  commissionAmount?: number;
  status: string;
  missions: string[];
  missionsCount: number;
}

export interface AuthorizedPayment {
  id: Id<"missions">;
  clientId: Id<"users">;
  clientName: string;
  animal: { name: string; type: string; emoji: string };
  serviceName: string;
  serviceCategory: string;
  startDate: string;
  endDate: string;
  status: string;
  amount: number;
  announcerEarnings: number;
  paymentStatus: string;
  authorizedAt?: number;
  autoCaptureScheduledAt?: number;
  sessionType?: "individual" | "collective";
  serviceLocation?: "announcer_home" | "client_home";
  clientConfirmedAt?: number;
  autoConfirmedAt?: number;
  readyForPayout?: boolean;
}

export interface CancelledMission {
  id: Id<"missions">;
  cancelledBy: "client" | "announcer" | "system";
  cancelledAt: number;
  amount: number;
  announcerEarnings: number;
  refundAmount?: number;
  announcerRetainedAmount: number;
  clientName: string;
  serviceName: string;
  startDate: string;
  endDate: string;
  animal: { name: string; type: string; emoji: string };
  cancellationReason?: string;
}

export interface PaymentStats {
  totalPending: number;
  totalCollected: number;
  pendingCount: number;
  paidCount: number;
  totalEarned: number;
  totalGross: number;
  cancelledByClientCount: number;
  cancelledByClientLost: number;
  cancelledByAnnouncerCount: number;
  cancelledByAnnouncerLost: number;
  announcerRetainedFromCancellations: number;
}

// ─── Constantes ──────────────────────────────────────────

export const commissionTiers = [
  { min: 0, max: 149.99, rate: 15, label: "0 - 149\u20AC" },
  { min: 150, max: 499.99, rate: 10, label: "150 - 499\u20AC" },
  { min: 500, max: 999.99, rate: 7, label: "500 - 999\u20AC" },
  { min: 1000, max: 1499.99, rate: 5, label: "1000 - 1499\u20AC" },
  { min: 1500, max: Infinity, rate: 3, label: "1500\u20AC et +" },
];

// ─── Helpers ─────────────────────────────────────────────

export function getCommissionRate(amount: number): number {
  const tier = commissionTiers.find((t) => amount >= t.min && amount <= t.max);
  return tier?.rate || 15;
}

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

export function getNextPayoutDate(): {
  date: Date;
  daysUntil: number;
  formatted: string;
} {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const currentDay = now.getDate();

  let payoutDate: Date;
  if (currentDay >= 25) {
    payoutDate = new Date(currentYear, currentMonth + 1, 25);
  } else {
    payoutDate = new Date(currentYear, currentMonth, 25);
  }

  const diffTime = payoutDate.getTime() - now.getTime();
  const daysUntil = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return {
    date: payoutDate,
    daysUntil,
    formatted: payoutDate.toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
    }),
  };
}

export function getDaysUntilMission(startDate: string): number {
  const start = new Date(startDate);
  const now = new Date();
  start.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);
  return Math.ceil(
    (start.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );
}

export function getAvailableMonths(): { value: string; label: string }[] {
  const months = [];
  const now = new Date();

  for (let i = 0; i < 12; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      value: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
      label: date.toLocaleDateString("fr-FR", {
        month: "long",
        year: "numeric",
      }),
    });
  }

  return months;
}

export function isInMonth(dateStr: string, monthValue: string): boolean {
  const date = new Date(dateStr);
  const [year, month] = monthValue.split("-").map(Number);
  return date.getFullYear() === year && date.getMonth() + 1 === month;
}

export function missionOverlapsMonth(
  startDate: string,
  endDate: string,
  monthValue: string
): boolean {
  const [year, month] = monthValue.split("-").map(Number);
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0, 23, 59, 59);
  const start = new Date(startDate);
  const end = new Date(endDate);
  return start <= monthEnd && end >= monthStart;
}
