"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { History, Banknote, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/app/lib/utils";
import { formatPrice, getCommissionRate, type PayoutHistoryItem } from "../types";

function PayoutHistoryCard({ payout }: { payout: PayoutHistoryItem }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const grossAmount =
    payout.grossAmount ??
    Math.round(payout.amount / (1 - getCommissionRate(payout.amount) / 100));
  const commission = payout.commissionAmount ?? grossAmount - payout.amount;
  const rate = payout.grossAmount
    ? Math.round((commission / grossAmount) * 100)
    : getCommissionRate(payout.amount);

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
                payout.status === "completed"
                  ? "text-green-600"
                  : "text-amber-600"
              )}
            />
          </div>
          <div>
            <p className="font-semibold text-foreground">
              {payout.status === "completed"
                ? "Virement re\u00E7u"
                : "Virement en cours"}
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
                payout.status === "completed"
                  ? "text-green-600"
                  : "text-amber-600"
              )}
            >
              +{formatPrice(payout.amount)}
            </p>
            <p className="text-xs text-text-light">
              {payout.missionsCount} mission
              {payout.missionsCount > 1 ? "s" : ""}
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
                <span className="text-foreground">
                  {formatPrice(grossAmount)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-light">
                  Commission ({rate}%)
                </span>
                <span className="text-red-500">
                  -{formatPrice(commission)}
                </span>
              </div>
              <div className="flex justify-between border-t border-gray-200 pt-2 font-semibold">
                <span className="text-foreground">Net re&ccedil;u</span>
                <span className="text-green-600">
                  {formatPrice(payout.amount)}
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function PayoutHistory({
  historyList,
}: {
  historyList: PayoutHistoryItem[];
}) {
  return (
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

      {historyList.length === 0 ? (
        <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
          <p className="text-text-light">Aucun virement ce mois</p>
        </div>
      ) : (
        <div className="space-y-3">
          {historyList.map((payout) => (
            <PayoutHistoryCard key={payout.id} payout={payout} />
          ))}
        </div>
      )}
    </motion.div>
  );
}
