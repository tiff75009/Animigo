"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wallet,
  TrendingUp,
  CheckCircle,
  Clock,
  Calendar,
  Info,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Percent,
  History,
  CreditCard,
  X,
  CalendarClock,
  Banknote,
  CircleDollarSign,
  Sparkles,
  Users,
  User,
  MapPin,
  Home,
  Hourglass,
  BadgeCheck,
  PiggyBank,
  Coins,
} from "lucide-react";
import { cn } from "@/app/lib/utils";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/app/hooks/useAuth";
import type { Id } from "@/convex/_generated/dataModel";

// Types
interface PendingMission {
  id: Id<"missions">;
  clientId: Id<"users">;
  clientName: string;
  clientAvatar: string;
  animal: { name: string; type: string; emoji: string };
  service: string;
  serviceName: string;
  serviceCategory: string;
  startDate: string;
  endDate: string;
  amount: number;
  announcerEarnings?: number;
  paymentStatus: string;
  location: string;
}

interface PayoutHistoryItem {
  id: Id<"announcerPayouts">;
  date: number;
  amount: number;
  status: string;
  missions: string[];
  missionsCount: number;
}

interface AuthorizedPayment {
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
}

// Commission tiers
const commissionTiers = [
  { min: 0, max: 149.99, rate: 15, label: "0 - 149€" },
  { min: 150, max: 499.99, rate: 10, label: "150 - 499€" },
  { min: 500, max: 999.99, rate: 7, label: "500 - 999€" },
  { min: 1000, max: 1499.99, rate: 5, label: "1000 - 1499€" },
  { min: 1500, max: Infinity, rate: 3, label: "1500€ et +" },
];

function getCommissionRate(amount: number): number {
  const tier = commissionTiers.find((t) => amount >= t.min && amount <= t.max);
  return tier?.rate || 15;
}

// Helpers
function formatPrice(euros: number): string {
  return euros.toLocaleString("fr-FR", {
    style: "currency",
    currency: "EUR",
  });
}

function formatDateShort(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
  });
}

function getNextPayoutDate(): { date: Date; daysUntil: number; formatted: string } {
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

function getDaysUntilMission(startDate: string): number {
  const start = new Date(startDate);
  const now = new Date();
  start.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);
  return Math.ceil((start.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

// Mois disponibles (12 derniers mois)
function getAvailableMonths(): { value: string; label: string }[] {
  const months = [];
  const now = new Date();

  for (let i = 0; i < 12; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      value: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
      label: date.toLocaleDateString("fr-FR", { month: "long", year: "numeric" }),
    });
  }

  return months;
}

function isInMonth(dateStr: string, monthValue: string): boolean {
  const date = new Date(dateStr);
  const [year, month] = monthValue.split("-").map(Number);
  return date.getFullYear() === year && date.getMonth() + 1 === month;
}

// Sélecteur de mois
function MonthSelector({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const months = getAvailableMonths();
  const currentIndex = months.findIndex((m) => m.value === value);
  const currentMonth = months[currentIndex] || months[0];

  const goToPrevious = () => {
    if (currentIndex < months.length - 1) {
      onChange(months[currentIndex + 1].value);
    }
  };

  const goToNext = () => {
    if (currentIndex > 0) {
      onChange(months[currentIndex - 1].value);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={goToPrevious}
        disabled={currentIndex >= months.length - 1}
        className="rounded-lg p-2 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        <ChevronLeft className="h-5 w-5 text-gray-600" />
      </button>
      <div className="min-w-[160px] text-center">
        <p className="font-semibold text-foreground capitalize">{currentMonth.label}</p>
      </div>
      <button
        onClick={goToNext}
        disabled={currentIndex <= 0}
        className="rounded-lg p-2 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        <ChevronRight className="h-5 w-5 text-gray-600" />
      </button>
    </div>
  );
}

// Stat Card Component
function StatCard({
  icon: Icon,
  iconBg,
  iconColor,
  label,
  amount,
  count,
  countLabel,
  valueColor,
}: {
  icon: any;
  iconBg: string;
  iconColor: string;
  label: string;
  amount: number;
  count: number;
  countLabel: string;
  valueColor: string;
}) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-center gap-2">
        <div className={cn("rounded-lg p-1.5", iconBg)}>
          <Icon className={cn("h-4 w-4", iconColor)} />
        </div>
        <span className="text-xs font-medium text-text-light">{label}</span>
      </div>
      <p className={cn("text-2xl font-bold", valueColor)}>
        {formatPrice(amount)}
      </p>
      <p className="mt-1 text-xs text-text-light">
        {count} {countLabel}
      </p>
    </div>
  );
}

// Bannière Prochain Virement
function NextPayoutBanner({
  netAmount,
  missionsCount,
}: {
  netAmount: number;
  missionsCount: number;
}) {
  const { formatted, daysUntil } = getNextPayoutDate();

  if (netAmount === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary via-primary/90 to-secondary p-5 text-white shadow-xl shadow-primary/20"
    >
      <div className="absolute inset-0 opacity-10">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white" />
        <div className="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-white" />
      </div>

      <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 backdrop-blur">
            <CalendarClock className="h-7 w-7" />
          </div>
          <div>
            <p className="text-sm font-medium text-white/80">Prochain virement</p>
            <p className="text-lg font-bold capitalize">{formatted}</p>
            <div className="mt-1 flex items-center gap-2">
              <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-semibold backdrop-blur">
                {daysUntil === 0
                  ? "Aujourd'hui"
                  : daysUntil === 1
                    ? "Demain"
                    : `Dans ${daysUntil} jours`}
              </span>
              <span className="text-sm text-white/70">
                {missionsCount} mission{missionsCount > 1 ? "s" : ""}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm text-white/70">Vous recevrez</p>
            <p className="text-3xl font-bold">{formatPrice(netAmount)}</p>
            <p className="text-xs text-white/60">commission déjà déduite</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// Card Mission Confirmée
function ConfirmedMissionCard({ mission }: { mission: AuthorizedPayment }) {
  const daysUntil = getDaysUntilMission(mission.startDate);
  const isToday = daysUntil === 0;
  const isSoon = daysUntil > 0 && daysUntil <= 3;
  const isInProgress = mission.status === "in_progress";
  const isCompleted = mission.status === "completed";

  const captureDate = mission.autoCaptureScheduledAt
    ? new Date(mission.autoCaptureScheduledAt).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "group overflow-hidden rounded-2xl bg-white shadow-[0_2px_8px_-2px_rgba(0,0,0,0.08)] transition-all hover:shadow-[0_8px_24px_-4px_rgba(0,0,0,0.12)]",
        isCompleted && "ring-2 ring-green-200 ring-offset-1"
      )}
    >
      {/* Bannière statut */}
      {isCompleted ? (
        <div className="bg-gradient-to-r from-green-500 to-emerald-500 px-4 py-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20 backdrop-blur">
                <CheckCircle className="h-3.5 w-3.5 text-white" />
              </div>
              <span className="text-sm font-semibold text-white">
                Mission terminée
              </span>
            </div>
            {captureDate && (
              <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-medium text-white backdrop-blur">
                Capture le {captureDate}
              </span>
            )}
          </div>
        </div>
      ) : isInProgress ? (
        <div className="bg-gradient-to-r from-blue-500 to-indigo-500 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20 backdrop-blur">
              <Sparkles className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-sm font-semibold text-white">En cours</span>
          </div>
        </div>
      ) : isToday ? (
        <div className="bg-gradient-to-r from-primary to-orange-500 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20 backdrop-blur">
              <Clock className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-sm font-semibold text-white">
              Commence aujourd&apos;hui
            </span>
          </div>
        </div>
      ) : isSoon ? (
        <div className="bg-gradient-to-r from-amber-500 to-orange-400 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20 backdrop-blur">
              <Calendar className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-sm font-semibold text-white">
              J-{daysUntil}
            </span>
          </div>
        </div>
      ) : null}

      <div className="p-4">
        {/* En-tête */}
        <div className="mb-4 flex items-start gap-4">
          <div className="relative flex-shrink-0">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/5 to-primary/15 text-2xl ring-2 ring-white shadow-sm">
              {mission.animal?.emoji || "🐾"}
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="truncate text-base font-bold text-foreground">
                  {mission.serviceName}
                </h3>
                <p className="mt-0.5 text-sm text-text-light">
                  {mission.animal?.name || "Animal"} • {mission.clientName}
                </p>
              </div>
              <div className="flex-shrink-0 text-right">
                <p className="text-xl font-bold text-green-600">
                  +{formatPrice(mission.announcerEarnings)}
                </p>
                <p className="text-xs text-text-light">vous recevrez</p>
              </div>
            </div>
          </div>
        </div>

        {/* Ligne d'infos */}
        <div className="-mx-1 mb-3 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl bg-gray-50/80 px-3 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white shadow-sm">
              <Calendar className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Dates</p>
              <p className="text-sm font-semibold text-foreground">
                {formatDateShort(mission.startDate)}
                {mission.startDate !== mission.endDate &&
                  ` - ${formatDateShort(mission.endDate)}`}
              </p>
            </div>
          </div>

          <div className="hidden h-8 w-px bg-gray-200 sm:block" />

          <div className="flex items-center gap-2">
            <div
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-lg shadow-sm",
                mission.serviceLocation === "client_home"
                  ? "bg-teal-50"
                  : "bg-indigo-50"
              )}
            >
              {mission.serviceLocation === "client_home" ? (
                <Home className="h-4 w-4 text-teal-600" />
              ) : (
                <MapPin className="h-4 w-4 text-indigo-600" />
              )}
            </div>
            <div>
              <p className="text-xs text-gray-500">Lieu</p>
              <p className="text-sm font-semibold text-foreground">
                {mission.serviceLocation === "client_home"
                  ? "À domicile"
                  : "Chez vous"}
              </p>
            </div>
          </div>

          <div className="hidden h-8 w-px bg-gray-200 sm:block" />

          <div className="flex items-center gap-2">
            <div
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-lg shadow-sm",
                mission.sessionType === "collective" ? "bg-blue-50" : "bg-amber-50"
              )}
            >
              {mission.sessionType === "collective" ? (
                <Users className="h-4 w-4 text-blue-600" />
              ) : (
                <User className="h-4 w-4 text-amber-600" />
              )}
            </div>
            <div>
              <p className="text-xs text-gray-500">Format</p>
              <p className="text-sm font-semibold text-foreground">
                {mission.sessionType === "collective" ? "Collectif" : "Individuel"}
              </p>
            </div>
          </div>
        </div>

        {/* Badge statut paiement */}
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1.5 text-xs font-semibold text-green-700">
            <CheckCircle className="h-3.5 w-3.5" />
            Paiement confirmé
          </span>
          <span className="text-xs text-text-light">
            Montant client : {formatPrice(mission.amount)}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

// Modal Commission
function CommissionModal({
  isOpen,
  onClose,
  currentAmount,
}: {
  isOpen: boolean;
  onClose: () => void;
  currentAmount: number;
}) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="w-full max-w-md rounded-2xl bg-white p-6"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-6 flex items-center justify-between">
            <h3 className="text-xl font-bold text-foreground">
              Grille de commissions
            </h3>
            <button
              onClick={onClose}
              className="rounded-lg p-2 hover:bg-gray-100"
            >
              <X className="h-5 w-5 text-text-light" />
            </button>
          </div>

          <div className="space-y-2">
            {commissionTiers.map((tier, index) => {
              const isCurrentTier =
                currentAmount >= tier.min && currentAmount <= tier.max;
              return (
                <div
                  key={index}
                  className={cn(
                    "flex items-center justify-between rounded-xl px-4 py-3 transition-colors",
                    isCurrentTier ? "bg-primary/10 ring-2 ring-primary/20" : "bg-gray-50"
                  )}
                >
                  <span
                    className={cn(
                      "text-sm",
                      isCurrentTier ? "font-semibold text-primary" : "text-text-light"
                    )}
                  >
                    {tier.label}
                  </span>
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "font-bold",
                        isCurrentTier ? "text-primary" : "text-foreground"
                      )}
                    >
                      {tier.rate}%
                    </span>
                    {isCurrentTier && (
                      <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-white">
                        Actuel
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6 flex items-start gap-2 rounded-xl bg-blue-50 p-4">
            <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-600" />
            <p className="text-sm text-blue-700">
              Plus votre volume mensuel est élevé, plus votre taux de commission
              diminue. Continuez à développer votre activité !
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// Historique Virement Card
function PayoutHistoryCard({ payout }: { payout: PayoutHistoryItem }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const rate = getCommissionRate(payout.amount);
  const grossAmount = Math.round(payout.amount / (1 - rate / 100));
  const commission = grossAmount - payout.amount;

  return (
    <div className="overflow-hidden rounded-xl border border-gray-100 bg-white">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-gray-50"
      >
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-full",
              payout.status === "completed" ? "bg-green-100" : "bg-amber-100"
            )}
          >
            <Banknote
              className={cn(
                "h-5 w-5",
                payout.status === "completed" ? "text-green-600" : "text-amber-600"
              )}
            />
          </div>
          <div>
            <p className="font-semibold text-foreground">
              {payout.status === "completed" ? "Virement reçu" : "Virement en cours"}
            </p>
            <p className="text-sm text-text-light">
              {new Date(payout.date).toLocaleDateString("fr-FR", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <p
              className={cn(
                "text-lg font-bold",
                payout.status === "completed" ? "text-green-600" : "text-amber-600"
              )}
            >
              +{formatPrice(payout.amount)}
            </p>
            <p className="text-xs text-text-light">
              {payout.missionsCount} mission{payout.missionsCount > 1 ? "s" : ""}
            </p>
          </div>
          {isExpanded ? (
            <ChevronUp className="h-5 w-5 text-text-light" />
          ) : (
            <ChevronDown className="h-5 w-5 text-text-light" />
          )}
        </div>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-gray-100 bg-gray-50/50 px-4 py-3"
          >
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-text-light">Montant brut</span>
                <span className="text-foreground">{formatPrice(grossAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-light">Commission ({rate}%)</span>
                <span className="text-red-500">-{formatPrice(commission)}</span>
              </div>
              <div className="flex justify-between border-t border-gray-200 pt-2 font-semibold">
                <span className="text-foreground">Net reçu</span>
                <span className="text-green-600">{formatPrice(payout.amount)}</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Loading skeleton
function LoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-32 rounded-2xl bg-gray-200" />
      <div className="h-12 w-48 mx-auto rounded-xl bg-gray-200" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="h-24 rounded-2xl bg-gray-200" />
        <div className="h-24 rounded-2xl bg-gray-200" />
        <div className="h-24 rounded-2xl bg-gray-200" />
        <div className="h-24 rounded-2xl bg-gray-200" />
      </div>
      <div className="h-64 rounded-2xl bg-gray-200" />
    </div>
  );
}

// Page principale
export default function PaiementsPage() {
  const [showCommissionModal, setShowCommissionModal] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  const { token, isLoading: authLoading } = useAuth();

  // Queries
  const stats = useQuery(
    api.dashboard.payments.getAnnouncerPaymentStats,
    token ? { sessionToken: token } : "skip"
  );

  const authorizedPayments = useQuery(
    api.dashboard.payments.getAuthorizedPayments,
    token ? { sessionToken: token } : "skip"
  );

  const pendingPayments = useQuery(
    api.dashboard.payments.getAnnouncerPendingPayments,
    token ? { sessionToken: token } : "skip"
  );

  const payoutHistory = useQuery(
    api.dashboard.payments.getAnnouncerPayoutHistory,
    token ? { sessionToken: token, limit: 12 } : "skip"
  );

  const isLoading = authLoading || stats === undefined;

  // Calculs avec filtre par mois
  const monthlyData = useMemo(() => {
    const authorizedList = (authorizedPayments || []) as AuthorizedPayment[];
    const pendingList = (pendingPayments || []) as PendingMission[];
    const historyList = (payoutHistory || []) as PayoutHistoryItem[];

    // Filtrer par mois sélectionné
    const filteredAuthorized = authorizedList.filter((m) =>
      isInMonth(m.startDate, selectedMonth)
    );
    const filteredPending = pendingList.filter((m) =>
      isInMonth(m.startDate, selectedMonth)
    );
    const filteredHistory = historyList.filter((p) =>
      isInMonth(new Date(p.date).toISOString(), selectedMonth)
    );

    // Calculs des 4 catégories (workflow paiement)
    // 1. En attente = missions où le client n'a pas encore payé (pending_acceptance, pending_confirmation)
    //    Note: Ces missions ne sont pas dans authorizedPayments ni pendingPayments
    //    Pour l'instant on affiche 0, à implémenter si besoin
    const pendingPayment = 0;
    const pendingPaymentCount = 0;

    // 2. Confirmé = Client A PAYÉ, mission à venir ou en cours (upcoming, in_progress)
    const confirmed = filteredAuthorized.filter(
      (m) => m.status === "upcoming" || m.status === "in_progress"
    );
    const totalConfirmed = confirmed.reduce(
      (sum, m) => sum + m.announcerEarnings,
      0
    );

    // 3. À encaisser = Mission TERMINÉE, paiement capturé, en attente de virement
    const toCollect = filteredPending.filter((m) => m.paymentStatus === "pending");
    const totalToCollect = toCollect.reduce(
      (sum, m) => sum + (m.announcerEarnings || m.amount * 0.85),
      0
    );

    // 4. Encaissé = Virements effectués ce mois
    const totalCollected = filteredHistory.reduce((sum, p) => sum + p.amount, 0);

    return {
      // Stats
      pendingPayment,
      pendingPaymentCount,
      confirmed: totalConfirmed,
      confirmedCount: confirmed.length,
      toCollect: totalToCollect,
      toCollectCount: toCollect.length,
      collected: totalCollected,
      collectedCount: filteredHistory.length,
      // Listes
      authorizedList: filteredAuthorized,
      pendingList: filteredPending,
      historyList: filteredHistory,
      // Totaux globaux (non filtrés)
      totalAvailable: (authorizedPayments || []).reduce(
        (sum: number, m: AuthorizedPayment) => sum + m.announcerEarnings,
        0
      ) + (stats?.totalPending || 0),
      totalMissionsCount:
        (authorizedPayments || []).length + (pendingPayments || []).length,
    };
  }, [authorizedPayments, pendingPayments, payoutHistory, stats, selectedMonth]);

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  const sortedMissions = [...monthlyData.authorizedList].sort(
    (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
  );

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-primary/10 p-3">
            <Wallet className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground md:text-3xl">
              Mes revenus
            </h1>
            <p className="text-text-light">
              Suivez vos paiements et virements
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowCommissionModal(true)}
          className="flex items-center gap-2 rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-gray-200"
        >
          <Percent className="h-4 w-4" />
          <span className="hidden sm:inline">Voir les frais</span>
        </button>
      </motion.div>

      {/* Bannière Prochain Virement */}
      <NextPayoutBanner
        netAmount={monthlyData.totalAvailable}
        missionsCount={monthlyData.totalMissionsCount}
      />

      {/* Sélecteur de mois */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="flex justify-center"
      >
        <div className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 shadow-sm">
          <Calendar className="h-5 w-5 text-primary" />
          <MonthSelector value={selectedMonth} onChange={setSelectedMonth} />
        </div>
      </motion.div>

      {/* Stats Cards - 4 catégories du workflow paiement */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
      >
        <StatCard
          icon={Hourglass}
          iconBg="bg-amber-100"
          iconColor="text-amber-600"
          label="En attente"
          amount={monthlyData.pendingPayment}
          count={monthlyData.pendingPaymentCount}
          countLabel={monthlyData.pendingPaymentCount > 1 ? "missions" : "mission"}
          valueColor="text-amber-600"
        />
        <StatCard
          icon={BadgeCheck}
          iconBg="bg-blue-100"
          iconColor="text-blue-600"
          label="Confirmé"
          amount={monthlyData.confirmed}
          count={monthlyData.confirmedCount}
          countLabel={monthlyData.confirmedCount > 1 ? "missions" : "mission"}
          valueColor="text-blue-600"
        />
        <StatCard
          icon={PiggyBank}
          iconBg="bg-purple-100"
          iconColor="text-purple-600"
          label="À encaisser"
          amount={monthlyData.toCollect}
          count={monthlyData.toCollectCount}
          countLabel={monthlyData.toCollectCount > 1 ? "missions" : "mission"}
          valueColor="text-purple-600"
        />
        <StatCard
          icon={Coins}
          iconBg="bg-green-100"
          iconColor="text-green-600"
          label="Encaissé"
          amount={monthlyData.collected}
          count={monthlyData.collectedCount}
          countLabel={monthlyData.collectedCount > 1 ? "virements" : "virement"}
          valueColor="text-green-600"
        />
      </motion.div>

      {/* Missions du mois */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-bold text-foreground">
            <CreditCard className="h-5 w-5 text-primary" />
            Missions du mois
            {sortedMissions.length > 0 && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-sm font-semibold text-primary">
                {sortedMissions.length}
              </span>
            )}
          </h2>
        </div>

        {sortedMissions.length === 0 ? (
          <div className="rounded-2xl bg-white p-10 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100">
              <Calendar className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="font-semibold text-foreground">
              Aucune mission ce mois
            </h3>
            <p className="mt-1 text-sm text-text-light">
              Sélectionnez un autre mois ou attendez de nouvelles réservations
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {sortedMissions.map((mission, index) => (
              <motion.div
                key={mission.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + index * 0.05 }}
              >
                <ConfirmedMissionCard mission={mission} />
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Historique des virements du mois */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div className="mb-4 flex items-center gap-2">
          <History className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold text-foreground">
            Virements du mois
          </h2>
        </div>

        {monthlyData.historyList.length === 0 ? (
          <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
            <p className="text-text-light">Aucun virement ce mois</p>
          </div>
        ) : (
          <div className="space-y-3">
            {monthlyData.historyList.map((payout) => (
              <PayoutHistoryCard key={payout.id} payout={payout} />
            ))}
          </div>
        )}
      </motion.div>

      {/* Modal Commission */}
      <CommissionModal
        isOpen={showCommissionModal}
        onClose={() => setShowCommissionModal(false)}
        currentAmount={stats?.totalEarned || 0}
      />
    </div>
  );
}
