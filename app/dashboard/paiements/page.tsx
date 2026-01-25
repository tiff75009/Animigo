"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CreditCard,
  Euro,
  TrendingUp,
  ArrowDownToLine,
  CheckCircle,
  Clock,
  Calendar,
  Info,
  ChevronDown,
  ChevronUp,
  Percent,
  Wallet,
  History,
  AlertCircle,
  ArrowRight,
  X,
  Loader2,
} from "lucide-react";
import { cn } from "@/app/lib/utils";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/app/hooks/useAuth";
import type { Id } from "@/convex/_generated/dataModel";

// Type pour les missions en attente de paiement
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
  paymentStatus: string;
  location: string;
}

// Type pour l'historique des virements
interface PayoutHistoryItem {
  id: Id<"announcerPayouts">;
  date: number;
  amount: number;
  status: string;
  missions: string[];
  missionsCount: number;
}

// Type pour les paiements autorisés (en capture)
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
}

// Commission tiers
const commissionTiers = [
  { min: 0, max: 149.99, rate: 15, label: "0 - 149€" },
  { min: 150, max: 499.99, rate: 10, label: "150 - 499€" },
  { min: 500, max: 999.99, rate: 7, label: "500 - 999€" },
  { min: 1000, max: 1499.99, rate: 5, label: "1000 - 1499€" },
  { min: 1500, max: Infinity, rate: 3, label: "1500€ et +" },
];

// Calculate commission based on amount
function calculateCommission(amount: number): { rate: number; fee: number; net: number } {
  const tier = commissionTiers.find((t) => amount >= t.min && amount <= t.max);
  const rate = tier?.rate || 15;
  const fee = (amount * rate) / 100;
  const net = amount - fee;
  return { rate, fee, net };
}

// Pending Payment Card
function PendingPaymentCard({
  mission,
  isSelected,
  onToggle,
}: {
  mission: PendingMission;
  isSelected: boolean;
  onToggle: () => void;
}) {
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
    });
  };

  return (
    <motion.div
      className={cn(
        "bg-white rounded-xl p-4 border-2 transition-all cursor-pointer",
        isSelected
          ? "border-primary bg-primary/5"
          : "border-transparent hover:border-gray-200"
      )}
      onClick={onToggle}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
    >
      <div className="flex items-center gap-4">
        {/* Checkbox */}
        <div
          className={cn(
            "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors",
            isSelected
              ? "bg-primary border-primary"
              : "border-gray-300"
          )}
        >
          {isSelected && <CheckCircle className="w-4 h-4 text-white" />}
        </div>

        {/* Mission Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">{mission.animal.emoji}</span>
            <h4 className="font-semibold text-foreground truncate">
              {mission.service} - {mission.animal.name}
            </h4>
          </div>
          <p className="text-sm text-text-light">
            {mission.clientName} &bull; {formatDate(mission.startDate)} - {formatDate(mission.endDate)}
          </p>
        </div>

        {/* Amount */}
        <div className="text-right">
          <p className="text-xl font-bold text-primary">{mission.amount}€</p>
          <p className="text-xs text-text-light">À encaisser</p>
        </div>
      </div>
    </motion.div>
  );
}

// Commission Tier Display
function CommissionTiers({ currentAmount }: { currentAmount: number }) {
  return (
    <div className="bg-gray-50 rounded-xl p-4">
      <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
        <Percent className="w-4 h-4 text-primary" />
        Grille tarifaire des commissions
      </h4>
      <div className="space-y-2">
        {commissionTiers.map((tier, index) => {
          const isCurrentTier = currentAmount >= tier.min && currentAmount <= tier.max;
          return (
            <div
              key={index}
              className={cn(
                "flex items-center justify-between py-2 px-3 rounded-lg transition-colors",
                isCurrentTier ? "bg-primary/10" : "hover:bg-gray-100"
              )}
            >
              <span className={cn(
                "text-sm",
                isCurrentTier ? "font-semibold text-primary" : "text-text-light"
              )}>
                {tier.label}
              </span>
              <span className={cn(
                "font-semibold",
                isCurrentTier ? "text-primary" : "text-foreground"
              )}>
                {tier.rate}%
              </span>
              {isCurrentTier && (
                <span className="ml-2 px-2 py-0.5 bg-primary text-white text-xs rounded-full">
                  Actuel
                </span>
              )}
            </div>
          );
        })}
      </div>
      <p className="text-xs text-text-light mt-3 flex items-start gap-1">
        <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
        Plus le montant encaissé est élevé, plus le taux de commission est bas.
      </p>
    </div>
  );
}

// Cashout Modal
function CashoutModal({
  isOpen,
  onClose,
  selectedMissions,
  totalAmount,
}: {
  isOpen: boolean;
  onClose: () => void;
  selectedMissions: PendingMission[];
  totalAmount: number;
}) {
  const [customAmount, setCustomAmount] = useState<string>(totalAmount.toString());
  const [cashoutType, setCashoutType] = useState<"full" | "partial">("full");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const amount = cashoutType === "full" ? totalAmount : Math.min(parseFloat(customAmount) || 0, totalAmount);
  const { rate, fee, net } = calculateCommission(amount);

  const handleCashout = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setIsSuccess(true);
      setTimeout(() => {
        onClose();
        setIsSuccess(false);
      }, 2000);
    }, 1500);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {isSuccess ? (
            <div className="text-center py-8">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4"
              >
                <CheckCircle className="w-10 h-10 text-green-500" />
              </motion.div>
              <h3 className="text-xl font-bold text-foreground mb-2">
                Demande envoyée !
              </h3>
              <p className="text-text-light">
                Votre virement de {net.toFixed(2)}€ sera effectué sous 48h.
              </p>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-foreground">
                  Encaisser mes gains
                </h3>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X className="w-5 h-5 text-text-light" />
                </button>
              </div>

              {/* Amount Selection */}
              <div className="mb-6">
                <p className="text-sm font-medium text-foreground mb-3">
                  Montant à encaisser
                </p>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <motion.button
                    className={cn(
                      "py-3 px-4 rounded-xl font-semibold border-2 transition-all",
                      cashoutType === "full"
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-gray-200 text-foreground hover:border-gray-300"
                    )}
                    onClick={() => setCashoutType("full")}
                    whileTap={{ scale: 0.98 }}
                  >
                    Tout ({totalAmount}€)
                  </motion.button>
                  <motion.button
                    className={cn(
                      "py-3 px-4 rounded-xl font-semibold border-2 transition-all",
                      cashoutType === "partial"
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-gray-200 text-foreground hover:border-gray-300"
                    )}
                    onClick={() => setCashoutType("partial")}
                    whileTap={{ scale: 0.98 }}
                  >
                    Partiel
                  </motion.button>
                </div>

                {cashoutType === "partial" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                  >
                    <div className="relative">
                      <input
                        type="number"
                        value={customAmount}
                        onChange={(e) => setCustomAmount(e.target.value)}
                        max={totalAmount}
                        className="w-full px-4 py-3 pr-12 bg-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground text-lg font-semibold"
                        placeholder="Montant"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-text-light font-semibold">
                        €
                      </span>
                    </div>
                    <p className="text-xs text-text-light mt-2">
                      Maximum disponible : {totalAmount}€
                    </p>
                  </motion.div>
                )}
              </div>

              {/* Summary */}
              <div className="bg-gray-50 rounded-xl p-4 mb-6">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-text-light">Montant brut</span>
                    <span className="font-semibold text-foreground">{amount.toFixed(2)}€</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-light flex items-center gap-1">
                      Commission ({rate}%)
                      <Info className="w-3 h-3" />
                    </span>
                    <span className="font-semibold text-red-500">-{fee.toFixed(2)}€</span>
                  </div>
                  <div className="border-t border-gray-200 pt-3 flex justify-between">
                    <span className="font-semibold text-foreground">Montant net</span>
                    <span className="text-xl font-bold text-primary">{net.toFixed(2)}€</span>
                  </div>
                </div>
              </div>

              {/* Commission Tip */}
              {amount < 1500 && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-6 flex items-start gap-2">
                  <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-700">
                    <p className="font-semibold">Astuce</p>
                    <p>
                      En encaissant {commissionTiers.find((t) => t.min > amount)?.min || 1500}€ ou plus,
                      vous bénéficiez d&apos;un taux réduit de {commissionTiers.find((t) => t.min > amount)?.rate || 3}%.
                    </p>
                  </div>
                </div>
              )}

              {/* Missions included */}
              <div className="mb-6">
                <p className="text-sm font-medium text-foreground mb-2">
                  Missions incluses ({selectedMissions.length})
                </p>
                <div className="max-h-32 overflow-y-auto space-y-2">
                  {selectedMissions.map((mission) => (
                    <div
                      key={mission.id}
                      className="flex items-center justify-between text-sm py-1"
                    >
                      <span className="text-text-light flex items-center gap-1">
                        {mission.animal.emoji} {mission.animal.name} - {mission.clientName}
                      </span>
                      <span className="font-medium">{mission.amount}€</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* CTA */}
              <motion.button
                onClick={handleCashout}
                disabled={isProcessing || amount <= 0}
                className={cn(
                  "w-full py-4 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors",
                  isProcessing
                    ? "bg-gray-300 cursor-not-allowed"
                    : "bg-primary text-white hover:bg-primary/90"
                )}
                whileHover={{ scale: isProcessing ? 1 : 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                {isProcessing ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Traitement en cours...
                  </>
                ) : (
                  <>
                    <ArrowDownToLine className="w-5 h-5" />
                    Encaisser {net.toFixed(2)}€
                  </>
                )}
              </motion.button>
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// Transaction History Item
function TransactionItem({ transaction }: { transaction: PayoutHistoryItem }) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Calculer la commission approximative (15% par défaut)
  const fee = Math.round(transaction.amount * 0.15);
  const grossAmount = transaction.amount + fee;

  return (
    <div className="border-b border-gray-100 last:border-0">
      <div
        className="flex items-center justify-between py-4 cursor-pointer hover:bg-gray-50 px-2 -mx-2 rounded-lg"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center",
            transaction.status === "completed" ? "bg-green-100" : "bg-orange-100"
          )}>
            <ArrowDownToLine className={cn(
              "w-5 h-5",
              transaction.status === "completed" ? "text-green-600" : "text-orange-600"
            )} />
          </div>
          <div>
            <p className="font-semibold text-foreground">
              {transaction.status === "completed" ? "Virement reçu" : "Virement en cours"}
            </p>
            <p className="text-sm text-text-light">
              {new Date(transaction.date).toLocaleDateString("fr-FR", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className={cn(
              "font-bold",
              transaction.status === "completed" ? "text-green-600" : "text-orange-600"
            )}>
              +{transaction.amount}€
            </p>
            <p className="text-xs text-text-light">Net reçu</p>
          </div>
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-text-light" />
          ) : (
            <ChevronDown className="w-5 h-5 text-text-light" />
          )}
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="pb-4 px-2"
          >
            <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-text-light">Montant brut</span>
                <span className="text-foreground">{grossAmount}€</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-light">Commission</span>
                <span className="text-red-500">-{fee}€</span>
              </div>
              <div className="flex justify-between font-semibold pt-2 border-t border-gray-200">
                <span className="text-foreground">Montant net</span>
                <span className="text-green-600">{transaction.amount}€</span>
              </div>
              {transaction.missions.length > 0 && (
                <div className="pt-2 border-t border-gray-200">
                  <p className="text-text-light mb-1">Missions concernées ({transaction.missionsCount}) :</p>
                  {transaction.missions.slice(0, 3).map((mission, i) => (
                    <p key={i} className="text-foreground">&bull; {mission}</p>
                  ))}
                  {transaction.missions.length > 3 && (
                    <p className="text-text-light">... et {transaction.missions.length - 3} autres</p>
                  )}
                </div>
              )}
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
    <div className="space-y-6 max-w-5xl mx-auto animate-pulse">
      <div className="h-20 bg-gray-200 rounded-2xl" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="h-32 bg-gray-200 rounded-2xl" />
        <div className="h-32 bg-gray-200 rounded-2xl" />
        <div className="h-32 bg-gray-200 rounded-2xl" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 h-96 bg-gray-200 rounded-2xl" />
        <div className="h-96 bg-gray-200 rounded-2xl" />
      </div>
    </div>
  );
}

export default function PaiementsPage() {
  const [selectedMissionIds, setSelectedMissionIds] = useState<string[]>([]);
  const [showCashoutModal, setShowCashoutModal] = useState(false);

  const { token, isLoading: authLoading } = useAuth();

  // Queries Convex
  const pendingPayments = useQuery(
    api.dashboard.payments.getAnnouncerPendingPayments,
    token ? { sessionToken: token } : "skip"
  );

  const stats = useQuery(
    api.dashboard.payments.getAnnouncerPaymentStats,
    token ? { sessionToken: token } : "skip"
  );

  const payoutHistory = useQuery(
    api.dashboard.payments.getAnnouncerPayoutHistory,
    token ? { sessionToken: token, limit: 10 } : "skip"
  );

  const authorizedPayments = useQuery(
    api.dashboard.payments.getAuthorizedPayments,
    token ? { sessionToken: token } : "skip"
  );

  // Loading state
  const isLoading = authLoading || pendingPayments === undefined || stats === undefined;

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  // Data
  const pendingPaymentMissions = (pendingPayments || []) as PendingMission[];
  const payoutHistoryData = (payoutHistory || []) as PayoutHistoryItem[];
  const authorizedPaymentsList = (authorizedPayments || []) as AuthorizedPayment[];
  const totalPending = stats?.totalPending || 0;
  const totalCollected = stats?.totalCollected || 0;
  const totalEarned = stats?.totalEarned || 0;
  const totalAuthorized = authorizedPaymentsList.reduce((sum: number, p) => sum + p.announcerEarnings, 0);

  const selectedMissions = pendingPaymentMissions.filter((m) =>
    selectedMissionIds.includes(m.id)
  );
  const selectedAmount = selectedMissions.reduce((sum, m) => sum + m.amount, 0);

  const toggleMission = (missionId: string) => {
    setSelectedMissionIds((prev) =>
      prev.includes(missionId)
        ? prev.filter((id) => id !== missionId)
        : [...prev, missionId]
    );
  };

  const selectAll = () => {
    if (selectedMissionIds.length === pendingPaymentMissions.length) {
      setSelectedMissionIds([]);
    } else {
      setSelectedMissionIds(pendingPaymentMissions.map((m) => m.id));
    }
  };

  const { rate, fee, net } = calculateCommission(selectedAmount);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="p-3 bg-primary/10 rounded-2xl">
            <CreditCard className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">
              Paiements
            </h1>
            <p className="text-text-light">
              Gérez vos encaissements et consultez votre historique
            </p>
          </div>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
      >
        <div
          className="bg-white rounded-2xl p-5 shadow-lg cursor-help group relative"
          title="Paiements confirmés par les clients, en attente de capture automatique après la mission"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-blue-100 rounded-xl">
              <CreditCard className="w-5 h-5 text-blue-600" />
            </div>
            <span className="text-sm text-text-light flex items-center gap-1">
              Confirmé
              <Info className="w-3 h-3 opacity-50" />
            </span>
          </div>
          <p className="text-3xl font-bold text-blue-600">{totalAuthorized}€</p>
          <p className="text-sm text-text-light mt-1">
            {authorizedPaymentsList.length} mission{authorizedPaymentsList.length > 1 ? "s" : ""}
          </p>
          {/* Tooltip */}
          <div className="absolute hidden group-hover:block bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-lg z-10">
            <p className="font-semibold mb-1">Paiement confirmé</p>
            <p>Le client a validé le paiement. La capture sera effectuée automatiquement 48h après la fin de la mission.</p>
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-gray-900" />
          </div>
        </div>

        <div
          className="bg-white rounded-2xl p-5 shadow-lg cursor-help group relative"
          title="Missions terminées avec paiement capturé, virement automatique le 1er du mois"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-orange-100 rounded-xl">
              <Clock className="w-5 h-5 text-orange-600" />
            </div>
            <span className="text-sm text-text-light flex items-center gap-1">
              À encaisser
              <Info className="w-3 h-3 opacity-50" />
            </span>
          </div>
          <p className="text-3xl font-bold text-orange-600">{totalPending}€</p>
          <p className="text-sm text-text-light mt-1">
            {pendingPaymentMissions.length} mission{pendingPaymentMissions.length > 1 ? "s" : ""}
          </p>
          {/* Tooltip */}
          <div className="absolute hidden group-hover:block bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-lg z-10">
            <p className="font-semibold mb-1">À encaisser</p>
            <p>Missions terminées dont le paiement a été capturé. Le virement est effectué automatiquement le 1er de chaque mois.</p>
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-gray-900" />
          </div>
        </div>

        <div
          className="bg-white rounded-2xl p-5 shadow-lg cursor-help group relative"
          title="Montant total déjà viré sur votre compte bancaire"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-green-100 rounded-xl">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <span className="text-sm text-text-light flex items-center gap-1">
              Encaissé
              <Info className="w-3 h-3 opacity-50" />
            </span>
          </div>
          <p className="text-3xl font-bold text-green-600">{totalCollected}€</p>
          <p className="text-sm text-text-light mt-1">Total reçu</p>
          {/* Tooltip */}
          <div className="absolute hidden group-hover:block bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-lg z-10">
            <p className="font-semibold mb-1">Encaissé</p>
            <p>Montant total des virements effectués sur votre compte bancaire.</p>
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-gray-900" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-primary to-secondary rounded-2xl p-5 shadow-lg text-white">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-white/20 rounded-xl">
              <TrendingUp className="w-5 h-5" />
            </div>
            <span className="text-sm text-white/80">Total gagné</span>
          </div>
          <p className="text-3xl font-bold">{totalEarned}€</p>
          <p className="text-sm text-white/80 mt-1">Brut cumulé</p>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pending Payments */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-2 bg-white rounded-2xl shadow-lg p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Wallet className="w-5 h-5 text-primary" />
              Paiements en attente
            </h2>
            {pendingPaymentMissions.length > 0 && (
              <button
                onClick={selectAll}
                className="text-sm text-primary font-medium hover:underline"
              >
                {selectedMissionIds.length === pendingPaymentMissions.length
                  ? "Tout désélectionner"
                  : "Tout sélectionner"}
              </button>
            )}
          </div>

          {pendingPaymentMissions.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">
                Tout est encaissé !
              </h3>
              <p className="text-text-light">
                Vous n&apos;avez aucun paiement en attente.
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-3 mb-6">
                {pendingPaymentMissions.map((mission) => (
                  <PendingPaymentCard
                    key={mission.id}
                    mission={mission}
                    isSelected={selectedMissionIds.includes(mission.id)}
                    onToggle={() => toggleMission(mission.id)}
                  />
                ))}
              </div>

              {/* Selection Summary */}
              <AnimatePresence>
                {selectedMissionIds.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    className="bg-primary/5 border border-primary/20 rounded-xl p-4"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-foreground">
                        {selectedMissionIds.length} mission{selectedMissionIds.length > 1 ? "s" : ""} sélectionnée{selectedMissionIds.length > 1 ? "s" : ""}
                      </span>
                      <span className="text-xl font-bold text-primary">
                        {selectedAmount}€
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-sm text-text-light mb-4">
                      <span>Commission ({rate}%)</span>
                      <span>-{fee.toFixed(2)}€</span>
                    </div>

                    <div className="flex items-center justify-between mb-4 pt-3 border-t border-primary/20">
                      <span className="font-semibold text-foreground">Vous recevrez</span>
                      <span className="text-2xl font-bold text-green-600">{net.toFixed(2)}€</span>
                    </div>

                    <motion.button
                      onClick={() => setShowCashoutModal(true)}
                      className="w-full py-3 bg-primary text-white rounded-xl font-semibold flex items-center justify-center gap-2"
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                    >
                      <ArrowDownToLine className="w-5 h-5" />
                      Encaisser maintenant
                    </motion.button>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}
        </motion.div>

        {/* Sidebar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-6"
        >
          {/* Commission Tiers */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <CommissionTiers currentAmount={selectedAmount || totalPending} />
          </div>

          {/* Bank Info */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-primary" />
              Compte de réception
            </h3>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-sm text-text-light">IBAN</p>
              <p className="font-mono text-foreground text-sm">FR76 &bull;&bull;&bull;&bull; &bull;&bull;&bull;&bull; 847</p>
            </div>
            <p className="text-xs text-text-light mt-2 flex items-center gap-1">
              <Info className="w-3 h-3" />
              Virements sous 48h ouvrées
            </p>
          </div>
        </motion.div>
      </div>

      {/* Authorized Payments (Confirmés) */}
      {authorizedPaymentsList.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="bg-white rounded-2xl shadow-lg p-6"
        >
          <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-blue-600" />
            Paiements confirmés
            <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
              {authorizedPaymentsList.length}
            </span>
          </h2>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-4 flex items-start gap-2">
            <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-700">
              <p className="font-semibold">Paiements confirmés par les clients</p>
              <p>
                Ces paiements ont été validés par les clients et seront automatiquement capturés 48h après la fin de la mission.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {authorizedPaymentsList.map((payment) => {
              const formatDate = (dateStr: string) => {
                return new Date(dateStr).toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "short",
                });
              };

              const captureDate = payment.autoCaptureScheduledAt
                ? new Date(payment.autoCaptureScheduledAt).toLocaleDateString("fr-FR", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "À planifier";

              return (
                <div
                  key={payment.id}
                  className="bg-gray-50 rounded-xl p-4 border border-gray-100"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{payment.animal.emoji}</span>
                      <div>
                        <h4 className="font-semibold text-foreground">
                          {payment.serviceName} - {payment.animal.name}
                        </h4>
                        <p className="text-sm text-text-light">
                          {payment.clientName} &bull; {formatDate(payment.startDate)} - {formatDate(payment.endDate)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-blue-600">{payment.announcerEarnings}€</p>
                      <p className="text-xs text-text-light">Vous recevrez</p>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-gray-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "px-2 py-0.5 text-xs font-medium rounded-full",
                        payment.status === "upcoming"
                          ? "bg-purple-100 text-purple-700"
                          : "bg-blue-100 text-blue-700"
                      )}>
                        {payment.status === "upcoming" ? "À venir" : "En cours"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-text-light">
                      <Calendar className="w-4 h-4" />
                      <span>Capture prévue: {captureDate}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Transaction History */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-white rounded-2xl shadow-lg p-6"
      >
        <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
          <History className="w-5 h-5 text-primary" />
          Historique des virements
        </h2>

        {payoutHistoryData.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-text-light">Aucun virement effectué</p>
          </div>
        ) : (
          <div>
            {payoutHistoryData.map((transaction) => (
              <TransactionItem key={transaction.id} transaction={transaction} />
            ))}
          </div>
        )}
      </motion.div>

      {/* Cashout Modal */}
      <CashoutModal
        isOpen={showCashoutModal}
        onClose={() => setShowCashoutModal(false)}
        selectedMissions={selectedMissions}
        totalAmount={selectedAmount}
      />
    </div>
  );
}
